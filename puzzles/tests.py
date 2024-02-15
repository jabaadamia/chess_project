from django.test import TestCase, Client
from django.urls import reverse
from .models import Puzzle, Tag


class PuzzleHomeTest(TestCase):
    def setUp(self):
        # Create tag for testing
        self.tag1 = Tag.objects.create(name='tag1')
        
        self.client = Client()

    def test_puzzle_home_view(self):
        # Test for a tag with puzzles
        response = self.client.get(reverse('puzzle_home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'puzzles/puzzle_home.html')
        self.assertContains(response, 'tag1')
        self.assertNotContains(response, 'tag9')


class TagPuzzleListViewTest(TestCase):
    def setUp(self):
        # Create some puzzles and tags for testing
        self.tag1 = Tag.objects.create(name='tag1')
        self.tag2 = Tag.objects.create(name='tag2')
        self.tag3 = Tag.objects.create(name='tag3')

        self.puzzle1 = Puzzle.objects.create(
            fen='fen1', 
            solution='solution1', 
            description='Description 1'
        )
        self.puzzle1.tags.add(self.tag1)

        self.puzzle2 = Puzzle.objects.create(
            fen='fen2', 
            solution='solution2', 
            description='Description 2'
        )
        self.puzzle2.tags.add(self.tag2)

        self.client = Client()

    def test_tag_puzzle_list_view(self):
        # Test for a tag with puzzles
        response = self.client.get(reverse('tag_puzzle_list', kwargs={'tag': 'tag1'}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'puzzles/puzzles_by_tag.html')
        self.assertContains(response, 'Description 1')
        self.assertNotContains(response, 'Description 2')

        # Test for a tag without puzzles
        response = self.client.get(reverse('tag_puzzle_list', kwargs={'tag': 'tag3'}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'puzzles/puzzles_by_tag.html')
        self.assertNotContains(response, 'Description 1')
        self.assertNotContains(response, 'Description 2')
